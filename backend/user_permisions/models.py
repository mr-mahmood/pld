from django.db import models
from users.models import User
from areas.models import Area
from django.db.models import Prefetch
from django.db.models import QuerySet
    
class AccessPolicy(models.Model):
    id:int
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="area_policy"
    )

    areas = models.ManyToManyField(
        Area,
        related_name="permitted_users"
    )
    
    class Meta:
        db_table = 'access_policy'
        ordering = ["-user"]
        indexes = [
            models.Index(fields=["user"])
        ]

    def __str__(self):
        return f"{self.user.employe_number} -> {self.areas.count()} areas"
    
    @classmethod
    def get_user_policy(cls, user_id:int) -> 'AccessPolicy | None':
        try:
            return cls.objects.get(user__id=user_id)
        except cls.DoesNotExist:
            return None
        # in  code:
        # policy_instance = AccessPolicy.get_user_policy(some_user)
        # if policy_instance:
        #     areas = policy_instance.areas.all()
    
    @classmethod
    def has_access(cls, user_id:int, area_id:int) -> bool:
        return cls.objects.filter(
            user__id=user_id,
            areas__id=area_id,
        ).exists()

    @classmethod
    def get_users_access_to_area(cls, area: 'Area') -> list['User']:
        access_policies = cls.objects.filter(areas=area)
        if not access_policies.exists():
            return []
        return [policy.user for policy in access_policies]

    @classmethod
    def get_all_access_roles(cls) -> QuerySet['AccessPolicy']:
        """
        Retrieves all AccessPolicy objects, prefetching related user and specific areas.
        """
        return cls.objects.select_related("user").prefetch_related(
            Prefetch("areas", queryset=Area.get_all_area_for_super())
        )